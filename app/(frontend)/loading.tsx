import { AfromixSymbol } from "@/app/(frontend)/components/brand/afromix-logo";

export default function Loading() {
  return (
    <div className="flex h-full items-center justify-center py-24">
      <div className="flex flex-col items-center gap-4">
        <AfromixSymbol size={56} className="animate-pulse" />
        <div className="flex gap-1 items-end h-6">
          <div className="w-1.5 rounded-full bg-purple-500 bar-1" style={{ height: 16 }} />
          <div className="w-1.5 rounded-full bg-pink-500 bar-2" style={{ height: 24 }} />
          <div className="w-1.5 rounded-full bg-purple-400 bar-3" style={{ height: 12 }} />
        </div>
      </div>
    </div>
  );
}
