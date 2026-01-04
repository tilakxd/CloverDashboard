"use client";

import { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface SyncStatusProps {
  lastSync: {
    id: string;
    startTime: Date;
    endTime: Date | null;
    itemsFetched: number;
    status: string;
    error: string | null;
    createdAt: Date;
  } | null;
  onSync: () => Promise<void>;
}

export const SyncStatus = memo(function SyncStatus({ lastSync, onSync }: SyncStatusProps) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSync();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {lastSync?.status === "success" && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {lastSync?.status === "error" && (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <div>
              <p className="text-sm font-medium">
                {lastSync
                  ? lastSync.status === "success"
                    ? `Last synced: ${formatDate(lastSync.endTime || lastSync.startTime)}`
                    : "Sync failed"
                  : "No sync yet"}
              </p>
              {lastSync?.status === "success" && (
                <p className="text-xs text-muted-foreground">
                  {lastSync.itemsFetched} items fetched
                </p>
              )}
              {lastSync?.status === "error" && lastSync.error && (
                <p className="text-xs text-red-500">{lastSync.error}</p>
              )}
            </div>
          </div>
          <Button
            onClick={handleSync}
            disabled={syncing}
            size="sm"
            className="ml-4"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

