import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Leaf, Home, Search } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main
      id="main-content"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-buana-dark px-4"
    >
      {/* Background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                      h-[500px] w-[500px] rounded-full bg-jagawana/6 blur-[120px] pointer-events-none"
           aria-hidden="true" />
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full
                      bg-khatulistiwa/5 blur-[100px] pointer-events-none"
           aria-hidden="true" />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-12 flex items-center gap-2"
      >
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-jagawana to-jagawana-deep
                        flex items-center justify-center shadow-glow-green">
          <Leaf className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <span className="font-display font-bold text-white text-lg">Lantara</span>
      </motion.div>

      {/* 404 number */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="font-display text-[clamp(7rem,20vw,14rem)] font-extrabold leading-none
                   text-white/[0.04] select-none pointer-events-none"
        aria-hidden="true"
      >
        404
      </motion.div>

      {/* Content — overlaid on the 404 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.45 }}
        className="-mt-8 text-center space-y-4 z-10"
      >
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
          Halaman tidak ditemukan
        </h1>
        <p className="text-white/50 max-w-sm mx-auto text-sm sm:text-base">
          Halaman yang Anda cari tidak ada atau telah dipindahkan.
        </p>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mt-8 flex flex-col sm:flex-row items-center gap-3 z-10"
      >
        <Link to="/" className="btn-primary gap-2 px-6">
          <Home className="h-4 w-4" aria-hidden="true" />
          Beranda
        </Link>
        <Link
          to="/layanan"
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/8
                     px-6 py-2.5 text-sm font-semibold text-white/80 backdrop-blur-sm
                     hover:bg-white/15 hover:text-white transition-all duration-150"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Cari Layanan
        </Link>
      </motion.div>
    </main>
  );
}
