"use client";

import { useState } from "react";
import { LayoutList, TableProperties } from "lucide-react";
import ProductForm from "@/components/ProductForm";
import ProductBulkSheet from "@/components/ProductBulkSheet";

export default function NewProductPage() {
  const [mode, setMode] = useState<"single" | "bulk">("single");

  return (
    <>
      <div className="flex items-center gap-2 px-6 py-3 border-b border-neutral-100 bg-white">
        <span className="text-xs text-neutral-500 font-medium mr-1">Add mode:</span>
        <button
          onClick={() => setMode("single")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            mode === "single"
              ? "bg-black text-white border-black"
              : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
          }`}
        >
          <LayoutList className="w-3.5 h-3.5" />
          Single product
        </button>
        <button
          onClick={() => setMode("bulk")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            mode === "bulk"
              ? "bg-black text-white border-black"
              : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
          }`}
        >
          <TableProperties className="w-3.5 h-3.5" />
          Bulk — Spreadsheet
        </button>
        <span className="ml-3 text-xs text-neutral-400">
          {mode === "single" ? "Fill the form below to create one product." : "Add multiple products at once in a spreadsheet view."}
        </span>
      </div>

      {mode === "single" ? <ProductForm mode="new" /> : <ProductBulkSheet />}
    </>
  );
}
