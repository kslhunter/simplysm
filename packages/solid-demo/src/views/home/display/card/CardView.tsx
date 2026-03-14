import { Card } from "@simplysm/solid";

export function CardView() {
  return (
    <div class="space-y-8 p-4">
      {/* Basic Card */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic Card</h2>
        <Card class="p-4">
          <p>This is a basic card component. The shadow is emphasized on hover.</p>
        </Card>
      </section>

      {/* Card Grid */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Card Grid</h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card class="p-4">
            <h3>Card 1</h3>
            <p>This is the first card content.</p>
          </Card>
          <Card class="p-4">
            <h3>Card 2</h3>
            <p>This is the second card content.</p>
          </Card>
          <Card class="p-4">
            <h3>Card 3</h3>
            <p>This is the third card content.</p>
          </Card>
        </div>
      </section>

      {/* Interactive Card */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Interactive Card</h2>
        <Card class="p-4" onClick={() => alert("Card clicked!")}>
          <h3>Clickable Card</h3>
          <p>
            Click this card to see an alert.
          </p>
        </Card>
      </section>
    </div>
  );
}
