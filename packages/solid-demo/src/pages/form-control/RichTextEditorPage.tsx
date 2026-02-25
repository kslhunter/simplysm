import { createSignal } from "solid-js";
import { RichTextEditor, Invalid } from "@simplysm/solid";

export default function RichTextEditorPage() {
  const [html, setHtml] = createSignal("<p>Enter content here...</p>");

  return (
    <div class="space-y-12 p-6">
      {/* Basic usage */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic Usage</h2>
        <div class="space-y-6">
          <div>
            <h3 class="mb-3 text-lg font-bold">Controlled</h3>
            <RichTextEditor value={html()} onValueChange={setHtml} />
          </div>

          <div>
            <h3 class="mb-3 text-lg font-bold">HTML Output</h3>
            <pre class="max-h-40 overflow-auto rounded bg-base-100 p-2 text-xs dark:bg-base-800">
              {html()}
            </pre>
          </div>
        </div>
      </section>

      {/* State */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">State</h2>
        <div class="space-y-6">
          <div>
            <h3 class="mb-3 text-lg font-bold">Disabled</h3>
            <RichTextEditor value={html()} disabled />
          </div>

          <div>
            <h3 class="mb-3 text-lg font-bold">Invalid</h3>
            <Invalid message="Example error message">
              <RichTextEditor value={html()} onValueChange={setHtml} />
            </Invalid>
          </div>
        </div>
      </section>

      {/* Size */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Size</h2>
        <div class="space-y-6">
          <div>
            <h3 class="mb-3 text-lg font-bold">Small</h3>
            <RichTextEditor size="sm" value="<p>Small size</p>" />
          </div>

          <div>
            <h3 class="mb-3 text-lg font-bold">Default</h3>
            <RichTextEditor value="<p>Default size</p>" />
          </div>

          <div>
            <h3 class="mb-3 text-lg font-bold">Large</h3>
            <RichTextEditor size="lg" value="<p>Large size</p>" />
          </div>
        </div>
      </section>
    </div>
  );
}
