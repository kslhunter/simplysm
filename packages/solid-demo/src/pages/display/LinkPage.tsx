import { Link } from "@simplysm/solid";

export default function LinkPage() {
  return (
    <div class="space-y-8 p-6">
      {/* Basic */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic Link</h2>
        <p class="text-sm text-base-600 dark:text-base-400">
          You can use <Link href="https://example.com">inline links</Link> within text.
        </p>
      </section>

      {/* External link */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">External Link</h2>
        <p class="text-sm text-base-600 dark:text-base-400">
          We support{" "}
          <Link href="https://example.com" target="_blank" rel="noopener noreferrer">
            opening in a new tab
          </Link>
          {" "}with target="_blank".
        </p>
      </section>

      {/* In paragraph */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">In a Paragraph</h2>
        <p class="text-sm leading-relaxed text-base-600 dark:text-base-400">
          For more details about this library, see the <Link href="https://github.com">GitHub repository</Link>. If you encounter any issues, please report them to the <Link href="https://github.com/issues">issue tracker</Link>.
        </p>
      </section>

      {/* Custom styling */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Custom Styling</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          You can apply additional styles using the class prop.
        </p>
        <div class="space-y-2">
          <div>
            <Link href="#" class="text-lg font-bold">
              Large Link
            </Link>
          </div>
          <div>
            <Link href="#" class="text-danger-600 dark:text-danger-400">
              Danger Color Link
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
