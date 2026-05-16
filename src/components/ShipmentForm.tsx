import type { Shipment } from "@/lib/api";

type Props = {
  value: Shipment;
  onChange: (s: Shipment) => void;
  disabled?: boolean;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const baseInput =
  "px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow mono";

export function ShipmentForm({ value, onChange, disabled }: Props) {
  const set = <K extends keyof Shipment>(k: K, v: Shipment[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <fieldset
      disabled={disabled}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 disabled:opacity-60"
    >
      <Field label="Warehouse block">
        <select
          className={baseInput}
          value={value.Warehouse_block}
          onChange={(e) => set("Warehouse_block", e.target.value as any)}
        >
          {["A", "B", "C", "D", "F"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </Field>
      <Field label="Mode of shipment">
        <select
          className={baseInput}
          value={value.Mode_of_Shipment}
          onChange={(e) => set("Mode_of_Shipment", e.target.value as any)}
        >
          {["Ship", "Flight", "Road"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </Field>
      <Field label="Product importance">
        <select
          className={baseInput}
          value={value.Product_importance}
          onChange={(e) => set("Product_importance", e.target.value as any)}
        >
          {["low", "medium", "high"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </Field>
      <Field label="Customer care calls (0–10)">
        <input
          type="number"
          min={0}
          max={10}
          className={baseInput}
          value={value.Customer_care_calls}
          onChange={(e) => set("Customer_care_calls", parseInt(e.target.value) || 0)}
        />
      </Field>
      <Field label="Customer rating (1–5)">
        <input
          type="number"
          min={1}
          max={5}
          className={baseInput}
          value={value.Customer_rating}
          onChange={(e) => set("Customer_rating", parseInt(e.target.value) || 1)}
        />
      </Field>
      <Field label="Prior purchases">
        <input
          type="number"
          min={0}
          className={baseInput}
          value={value.Prior_purchases}
          onChange={(e) => set("Prior_purchases", parseInt(e.target.value) || 0)}
        />
      </Field>
      <Field label="Cost of product (USD)">
        <input
          type="number"
          min={1}
          className={baseInput}
          value={value.Cost_of_the_Product}
          onChange={(e) => set("Cost_of_the_Product", parseFloat(e.target.value) || 0)}
        />
      </Field>
      <Field label="Discount offered (%)">
        <input
          type="number"
          min={0}
          className={baseInput}
          value={value.Discount_offered}
          onChange={(e) => set("Discount_offered", parseFloat(e.target.value) || 0)}
        />
      </Field>
      <Field label="Weight (grams)">
        <input
          type="number"
          min={1}
          className={baseInput}
          value={value.Weight_in_gms}
          onChange={(e) => set("Weight_in_gms", parseFloat(e.target.value) || 0)}
        />
      </Field>
      <Field label="Gender">
        <select
          className={baseInput}
          value={value.Gender}
          onChange={(e) => set("Gender", e.target.value as any)}
        >
          {["F", "M"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </Field>
    </fieldset>
  );
}
