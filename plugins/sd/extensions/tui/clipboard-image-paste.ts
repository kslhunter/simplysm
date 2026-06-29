import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CustomEditor, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { matchesKey } from "@earendil-works/pi-tui";

type Notify = (message: string, type?: "info" | "warning" | "error") => void;

type ClipboardImageEditor = CustomEditor & {
	insertTextAtCursor?: (text: string) => void;
};

type ImageMarkerState = {
	counter: number;
	paths: Map<number, string>;
};

type PowerShellResult = {
	exitCode: number | null;
	stdout: string;
	stderr: string;
	timedOut: boolean;
};

type EditorSegment = (text: string, mode: "grapheme" | "word") => Iterable<Intl.SegmentData>;

const IMAGE_MARKER_PREFIX = "[image #";
const IMAGE_MARKER_REGEX = /\[image #(\d+)\]/g;
const POWERSHELL_NO_IMAGE_EXIT_CODE = 2;
const POWERSHELL_TIMEOUT_MS = 10_000;

export function registerClipboardImagePaste(pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;

		const currentEditorComponent = ctx.ui.getEditorComponent();
		ctx.ui.setEditorComponent((tui, theme, keybindings) => {
			const editor = (currentEditorComponent
				? currentEditorComponent(tui, theme, keybindings)
				: new CustomEditor(tui, theme, keybindings)) as ClipboardImageEditor;
			const imageMarkers: ImageMarkerState = { counter: 0, paths: new Map() };
			installImageMarkerExpansion(editor, imageMarkers);

			const handleInput = editor.handleInput.bind(editor);
			let isPastingImage = false;

			editor.handleInput = (data: string) => {
				if (!isPasteImageKey(data, keybindings)) {
					handleInput(data);
					return;
				}

				if (process.platform !== "win32") {
					handleInput(data);
					return;
				}

				if (isPastingImage) return;
				isPastingImage = true;
				void pasteWindowsClipboardImage(editor, imageMarkers, ctx.ui.notify.bind(ctx.ui), () => tui.requestRender()).finally(() => {
					isPastingImage = false;
				});
			};

			return editor;
		});
	});
}

function isPasteImageKey(data: string, keybindings: ConstructorParameters<typeof CustomEditor>[2]): boolean {
	return keybindings.matches(data, "app.clipboard.pasteImage") || matchesKey(data, "alt+v");
}

function installImageMarkerExpansion(editor: ClipboardImageEditor, imageMarkers: ImageMarkerState): void {
	const getExpandedText = editor.getExpandedText.bind(editor);
	editor.getExpandedText = () => expandImageMarkers(getExpandedText(), imageMarkers);

	const editorWithSegment = editor as unknown as { segment?: EditorSegment };
	const segment = editorWithSegment.segment?.bind(editor);
	if (segment) {
		editorWithSegment.segment = (text, mode) => segmentImageMarkers(text, segment(text, mode), imageMarkers);
	}

	const setText = editor.setText.bind(editor);
	editor.setText = (text: string) => {
		clearImageMarkers(imageMarkers);
		setText(text);
	};

	let onSubmit = editor.onSubmit;
	Object.defineProperty(editor, "onSubmit", {
		configurable: true,
		enumerable: true,
		get() {
			return onSubmit
				? (text: string) => {
						onSubmit?.(expandImageMarkers(text, imageMarkers));
						if (!editor.getText().trim()) {
							clearImageMarkers(imageMarkers);
						}
					}
				: undefined;
		},
		set(handler: ((text: string) => void) | undefined) {
			onSubmit = handler;
		},
	});
}

function createImageMarker(imageMarkers: ImageMarkerState, imagePath: string): string {
	imageMarkers.counter += 1;
	imageMarkers.paths.set(imageMarkers.counter, imagePath);
	return `[image #${imageMarkers.counter}]`;
}

function expandImageMarkers(text: string, imageMarkers: ImageMarkerState): string {
	return text.replace(IMAGE_MARKER_REGEX, (marker, rawImageId: string) => {
		const imagePath = imageMarkers.paths.get(Number.parseInt(rawImageId, 10));
		return imagePath ?? marker;
	});
}

function segmentImageMarkers(
	text: string,
	baseSegments: Iterable<Intl.SegmentData>,
	imageMarkers: ImageMarkerState,
): Intl.SegmentData[] | Iterable<Intl.SegmentData> {
	if (imageMarkers.paths.size === 0 || !text.includes(IMAGE_MARKER_PREFIX)) {
		return baseSegments;
	}

	const markerRanges: Array<{ start: number; end: number }> = [];
	for (const match of text.matchAll(IMAGE_MARKER_REGEX)) {
		const markerIndex = match.index;
		if (markerIndex === undefined) continue;

		const imageId = Number.parseInt(match[1] ?? "", 10);
		if (!imageMarkers.paths.has(imageId)) continue;

		markerRanges.push({ start: markerIndex, end: markerIndex + match[0].length });
	}

	if (markerRanges.length === 0) {
		return baseSegments;
	}

	const result: Intl.SegmentData[] = [];
	let markerRangeIndex = 0;
	for (const segment of baseSegments) {
		while (markerRangeIndex < markerRanges.length && markerRanges[markerRangeIndex]!.end <= segment.index) {
			markerRangeIndex += 1;
		}

		const markerRange = markerRanges[markerRangeIndex];
		if (markerRange && segment.index >= markerRange.start && segment.index < markerRange.end) {
			if (segment.index === markerRange.start) {
				result.push({
					segment: text.slice(markerRange.start, markerRange.end),
					index: markerRange.start,
					input: text,
				});
			}
			continue;
		}

		result.push(segment);
	}
	return result;
}

function clearImageMarkers(imageMarkers: ImageMarkerState): void {
	imageMarkers.counter = 0;
	imageMarkers.paths.clear();
}

async function pasteWindowsClipboardImage(
	editor: ClipboardImageEditor,
	imageMarkers: ImageMarkerState,
	notify: Notify,
	requestRender: () => void,
): Promise<void> {
	let imagePath: string | undefined;

	try {
		if (!editor.insertTextAtCursor) {
			throw new Error("현재 에디터가 텍스트 삽입을 지원하지 않습니다.");
		}

		imagePath = await createTempImagePath();
		const result = await writeClipboardImageToPng(imagePath);
		if (result === "no-image") {
			await removeTempImage(imagePath);
			return;
		}

		const marker = createImageMarker(imageMarkers, imagePath);
		editor.insertTextAtCursor(marker);
		requestRender();
	} catch (error) {
		if (imagePath) await removeTempImage(imagePath);
		notify(`클립보드 이미지 붙여넣기에 실패했습니다: ${formatError(error)}`, "error");
	}
}

async function createTempImagePath(): Promise<string> {
	const imageDir = join(tmpdir(), "pi-clipboard-images");
	await mkdir(imageDir, { recursive: true });
	return join(imageDir, `pi-clipboard-${randomUUID()}.png`);
}

async function writeClipboardImageToPng(imagePath: string): Promise<"ok" | "no-image"> {
	const script = `
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$image = $null
for ($attempt = 0; $attempt -lt 5; $attempt++) {
  try {
    $image = [System.Windows.Forms.Clipboard]::GetImage()
    break
  }
  catch {
    if ($attempt -eq 4) { throw }
    Start-Sleep -Milliseconds 100
  }
}
if ($null -eq $image) {
  [Console]::Error.WriteLine("NO_IMAGE")
  exit ${POWERSHELL_NO_IMAGE_EXIT_CODE}
}
try {
  $image.Save($env:PI_CLIPBOARD_IMAGE_OUT, [System.Drawing.Imaging.ImageFormat]::Png)
}
finally {
  $image.Dispose()
}
`;
	const result = await runPowerShell(script, { PI_CLIPBOARD_IMAGE_OUT: imagePath });

	if (result.timedOut) {
		throw new Error(`PowerShell 클립보드 읽기가 ${POWERSHELL_TIMEOUT_MS}ms 안에 끝나지 않았습니다.`);
	}
	if (result.exitCode === 0) return "ok";
	if (result.exitCode === POWERSHELL_NO_IMAGE_EXIT_CODE) return "no-image";

	const output = [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join("\n");
	throw new Error(output || `PowerShell 종료 코드 ${result.exitCode ?? "unknown"}`);
}

function runPowerShell(script: string, env: NodeJS.ProcessEnv): Promise<PowerShellResult> {
	return new Promise((resolve, reject) => {
		const encodedCommand = Buffer.from(script, "utf16le").toString("base64");
		const child = spawn(
			"powershell.exe",
			["-NoProfile", "-NonInteractive", "-Sta", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encodedCommand],
			{
				env: { ...process.env, ...env },
				stdio: ["ignore", "pipe", "pipe"],
				windowsHide: true,
			},
		);
		let stdout = "";
		let stderr = "";
		let timedOut = false;

		const timeout = setTimeout(() => {
			timedOut = true;
			child.kill();
		}, POWERSHELL_TIMEOUT_MS);

		child.stdout.setEncoding("utf8");
		child.stdout.on("data", (chunk: string) => {
			stdout += chunk;
		});
		child.stderr.setEncoding("utf8");
		child.stderr.on("data", (chunk: string) => {
			stderr += chunk;
		});
		child.on("error", (error) => {
			clearTimeout(timeout);
			reject(error);
		});
		child.on("close", (exitCode) => {
			clearTimeout(timeout);
			resolve({ exitCode, stdout, stderr, timedOut });
		});
	});
}

async function removeTempImage(imagePath: string): Promise<void> {
	await rm(imagePath, { force: true });
}

function formatError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
