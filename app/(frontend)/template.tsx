"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      // [&>*]:w-full : les pages en "max-w-* mx-auto" ne sont pas étirées dans un flex-col
      // et un carrousel horizontal élargissait alors toute la page sur mobile
      className="flex-1 flex flex-col w-full min-w-0 [&>*]:w-full [&>*]:min-w-0"
    >
      {children}
    </motion.div>
  );
}
