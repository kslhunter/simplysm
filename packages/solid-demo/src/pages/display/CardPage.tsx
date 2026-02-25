import { Card } from "@simplysm/solid";

export default function CardPage() {
  return (
    <div class="space-y-8 p-6">
      {/* Basic Card */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic Card</h2>
        <Card>
          <div class="p-4">
            <p>This is a basic card component. The shadow is emphasized on hover.</p>
          </div>
        </Card>
      </section>

      {/* Card with Header */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Card with Header</h2>
        <Card>
          <div class="border-b border-base-200 bg-base-50 px-4 py-3 dark:border-base-700 dark:bg-base-700/50">
            <h3 class="font-bold">Card Title</h3>
          </div>
          <div class="p-4">
            <p>This is the card body content.</p>
          </div>
        </Card>
      </section>

      {/* Card Grid */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Card Grid</h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <div class="p-4">
              <h3 class="mb-2 font-bold">Card 1</h3>
              <p class="text-sm text-base-600 dark:text-base-400">This is the first card content.</p>
            </div>
          </Card>
          <Card>
            <div class="p-4">
              <h3 class="mb-2 font-bold">Card 2</h3>
              <p class="text-sm text-base-600 dark:text-base-400">This is the second card content.</p>
            </div>
          </Card>
          <Card>
            <div class="p-4">
              <h3 class="mb-2 font-bold">Card 3</h3>
              <p class="text-sm text-base-600 dark:text-base-400">This is the third card content.</p>
            </div>
          </Card>
        </div>
      </section>

      {/* Interactive Card */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Interactive Card</h2>
        <Card onClick={() => alert("Card clicked!")}>
          <div class="p-4">
            <h3 class="mb-2 font-bold">Clickable Card</h3>
            <p class="text-sm text-base-600 dark:text-base-400">
              Click this card to see an alert.
            </p>
          </div>
        </Card>
      </section>

      {/* Card with Image */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Image Card</h2>
        <Card>
          <div class="h-40 bg-gradient-to-br from-primary-400 to-primary-600" />
          <div class="p-4">
            <h3 class="mb-2 font-bold">Card with Image</h3>
            <p class="text-sm text-base-600 dark:text-base-400">
              A card layout with an image area at the top.
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}
