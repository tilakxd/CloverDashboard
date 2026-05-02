"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { InventoryItem } from "@/components/DataTable";

interface LabelPayloadItem {
  name: string;
  price: number;
  sku: string;
}

interface PrintLabelsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: InventoryItem[];
}

type PrintStatus = "idle" | "sending" | "success" | "error";

export function PrintLabelsModal({
  open,
  onOpenChange,
  selectedItems,
}: PrintLabelsModalProps) {
  const [endpoint, setEndpoint] = useState(
    process.env.NEXT_PUBLIC_LABEL_PRINTER_URL ?? ""
  );
  const [status, setStatus] = useState<PrintStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleClose = () => {
    if (status === "sending") return;
    setStatus("idle");
    setErrorMessage("");
    onOpenChange(false);
  };

  const buildPayload = (): LabelPayloadItem[] =>
    selectedItems.map((item) => ({
      name: item.name,
      price: item.price,
      sku: item.sku ?? item.code ?? "",
    }));

  const handlePrint = async () => {
    if (!endpoint.trim()) {
      setErrorMessage("Please enter the printer API endpoint URL.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch(endpoint.trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels: buildPayload() }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        throw new Error(`Server responded with ${response.status}: ${text}`);
      }

      setStatus("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Labels
          </DialogTitle>
          <DialogDescription>
            Send {selectedItems.length} label{selectedItems.length !== 1 ? "s" : ""} to your label
            printer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Endpoint config */}
          <div className="space-y-1.5">
            <Label htmlFor="printer-endpoint">Printer API Endpoint</Label>
            <Input
              id="printer-endpoint"
              placeholder="http://192.168.1.x:8000/print"
              value={endpoint}
              onChange={(e) => {
                setEndpoint(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              disabled={status === "sending" || status === "success"}
            />
            <p className="text-xs text-muted-foreground">
              URL of the Python API running on your label printer PC.
            </p>
          </div>

          {/* Item list */}
          <div className="space-y-1.5">
            <Label>Items to print</Label>
            <ScrollArea className="h-52 rounded-md border p-2">
              <div className="space-y-1.5">
                {selectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-medium truncate">{item.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        SKU: {item.sku ?? item.code ?? "—"}
                      </span>
                    </div>
                    <Badge variant="secondary" className="ml-2 shrink-0">
                      {formatCurrency(item.price)}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Payload preview */}
          <details className="group">
            <summary className="cursor-pointer text-xs text-muted-foreground select-none group-open:mb-2">
              View JSON payload
            </summary>
            <pre className="rounded-md bg-muted p-3 text-xs overflow-auto max-h-36">
              {JSON.stringify({ labels: buildPayload() }, null, 2)}
            </pre>
          </details>

          {/* Status feedback */}
          {status === "success" && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Labels sent successfully!
            </div>
          )}
          {status === "error" && errorMessage && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              <XCircle className="h-4 w-4 shrink-0" />
              {errorMessage}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={status === "sending"}>
            {status === "success" ? "Close" : "Cancel"}
          </Button>
          {status !== "success" && (
            <Button onClick={handlePrint} disabled={status === "sending"}>
              {status === "sending" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Printer className="mr-2 h-4 w-4" />
                  Print {selectedItems.length} Label{selectedItems.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
