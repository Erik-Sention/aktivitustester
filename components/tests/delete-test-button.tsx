"use client";

import { useState } from "react";
import { deleteTestAction } from "@/app/actions/tests";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteTestButtonProps {
  testId: string;
  clientId: string;
}

export function DeleteTestButton({ testId, clientId }: DeleteTestButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await deleteTestAction(testId, clientId);
  }

  if (confirming) {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="destructive" onClick={handleDelete} disabled={loading}>
          {loading ? "Raderar..." : "Bekräfta radering"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>Avbryt</Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
      <Trash2 className="h-4 w-4" />
      Radera
    </Button>
  );
}
