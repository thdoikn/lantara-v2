import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBoard, type BoardRow } from "./api";
import { useBoardSocket } from "./useQueueSocket";

/**
 * Public lobby display board for an instansi — "now serving" per loket. No auth
 * (a screen on the wall). Live via WS, with a 10s REST refetch fallback. A called
 * number pulses in gold to draw the eye; served numbers rest in royal.
 */
export default function DisplayBoardPage() {
  const { instansiKey } = useParams<{ instansiKey: string }>();
  const qc = useQueryClient();
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const { data } = useQuery({
    queryKey: ["antrean", "board", instansiKey],
    queryFn: () => getBoard(instansiKey!),
    enabled: !!instansiKey,
    refetchInterval: 10_000,
  });

  useBoardSocket(instansiKey ?? null, () =>
    qc.invalidateQueries({ queryKey: ["antrean", "board", instansiKey] }),
  );

  return (
    <div className="min-h-screen bg-royal-950 px-8 py-10 text-white">
      <div className="mx-auto flex max-w-6xl items-baseline justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-royal-300">Mal Pelayanan Publik IKN</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight">
            {data?.instansi ?? "Antrean MPP"}
          </h1>
        </div>
        <p className="font-display text-3xl font-bold tabular-nums text-royal-200">{clock}</p>
      </div>
      <p className="mx-auto mt-1 max-w-6xl text-royal-300">Nomor yang sedang dilayani</p>

      <div className="mx-auto mt-10 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.loket ?? []).map((row) => (
          <BoardCard key={row.loket} row={row} />
        ))}
        {data && data.loket.length === 0 && (
          <p className="col-span-full mt-10 text-center text-xl text-royal-300">
            Belum ada loket yang dibuka.
          </p>
        )}
      </div>
    </div>
  );
}

function BoardCard({ row }: { row: BoardRow }) {
  const called = row.status === "called";
  return (
    <div
      className={`rounded-3xl border p-8 text-center transition ${
        called
          ? "animate-pulse motion-reduce:animate-none border-gold-500/60 bg-royal-900 shadow-glow-warm"
          : "border-royal-700/50 bg-royal-900 shadow-glow-royal"
      }`}
    >
      <p className="text-sm uppercase tracking-widest text-royal-300">{row.loket}</p>
      <p
        className={`mt-3 font-display text-8xl font-bold tabular-nums ${
          row.now_serving ? "text-gold-500" : "text-royal-700"
        }`}
      >
        {row.now_serving ?? "—"}
      </p>
      <p className={`mt-2 text-sm font-medium ${called ? "text-gold-500" : "text-royal-200"}`}>
        {row.status === "serving"
          ? "Sedang dilayani"
          : called
            ? "Silakan menuju loket"
            : "Menunggu"}
      </p>
    </div>
  );
}
