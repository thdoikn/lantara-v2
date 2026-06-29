import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBoard } from "./api";
import { useBoardSocket } from "./useQueueSocket";

/**
 * Public lobby display board for an instansi — "now serving" per loket. No auth
 * (a screen on the wall). Live via WS, with a 10s REST refetch fallback.
 */
export default function DisplayBoardPage() {
  const { instansiKey } = useParams<{ instansiKey: string }>();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["antrean", "board", instansiKey],
    queryFn: () => getBoard(instansiKey!),
    enabled: !!instansiKey,
    refetchInterval: 10_000,
  });

  useBoardSocket(instansiKey ?? null, () => {
    qc.invalidateQueries({ queryKey: ["antrean", "board", instansiKey] });
  });

  return (
    <div className="min-h-screen bg-royal-950 px-8 py-10 text-white">
      <h1 className="text-center font-display text-4xl font-bold tracking-tight">
        {data?.instansi ?? "Antrean MPP"}
      </h1>
      <p className="mt-1 text-center text-royal-200">Nomor yang sedang dilayani</p>

      <div className="mx-auto mt-10 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.loket ?? []).map((row) => (
          <div
            key={row.loket}
            className="rounded-3xl border border-royal-700/50 bg-royal-900 p-8 text-center shadow-glow-royal"
          >
            <p className="text-sm uppercase tracking-widest text-royal-300">{row.loket}</p>
            <p className="mt-3 text-7xl font-display font-bold text-gold-500">
              {row.now_serving ?? "—"}
            </p>
            <p className="mt-2 text-sm text-royal-200">
              {row.status === "serving"
                ? "Sedang dilayani"
                : row.status === "called"
                  ? "Silakan menuju loket"
                  : "Menunggu"}
            </p>
          </div>
        ))}
        {data && data.loket.length === 0 && (
          <p className="col-span-full text-center text-royal-300">
            Belum ada loket yang dibuka.
          </p>
        )}
      </div>
    </div>
  );
}
