/** Unauthenticated shell: a single centred card on the canvas (§7.1). */

import { LifeBuoy } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-screen grid-cols-1 lg:grid-cols-5 overflow-hidden">
      {/* Left Column: Form & Branding (40% on LG) */}
      <div className="col-span-1 flex flex-col justify-center px-8 py-4 sm:px-12 lg:col-span-2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-sm py-2">
          {/* Branding */}
          <div className="mb-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-sidebar shadow-md">
                <LifeBuoy aria-hidden className="size-6 text-accent" strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-bold tracking-tight text-text">Support Engine</span>
            </div>
            <p className="text-sm leading-relaxed text-text/70">
              The smartest, most streamlined way to manage your customer support and track SLA commitments seamlessly.
            </p>
          </div>
          
          {/* Auth Form */}
          {children}
        </div>
      </div>

      {/* Right Column: Visual Showcase (60% on LG) */}
      <div className="relative hidden col-span-3 items-center justify-center bg-gradient-sidebar overflow-hidden lg:flex">
        {/* 3D Gradient Background */}
        <div className="absolute inset-0">
          <Image
            src="/bg-shapes.jpg"
            alt="3D ambient background"
            fill
            unoptimized
            className="object-cover opacity-60 mix-blend-overlay"
          />
        </div>
        
        <div className="relative w-full max-w-[85%] aspect-[4/3]">
          {/* Bottom Image (im2.jpg) */}
          <div className="absolute right-4 top-4 w-[75%] transform rounded-xl border border-white/10 shadow-2xl rotate-2 overflow-hidden bg-canvas">
            <Image
              src="/im2.jpg"
              alt="Support Dashboard"
              width={1200}
              height={800}
              unoptimized
              className="h-auto w-full object-cover"
              priority
            />
          </div>

          {/* Top Image (im1.jpg) */}
          <div className="absolute bottom-8 left-0 z-10 w-[70%] transform rounded-xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] -rotate-2 overflow-hidden bg-canvas">
            <Image
              src="/im1.jpg"
              alt="Ticket Interface"
              width={1200}
              height={800}
              unoptimized
              className="h-auto w-full object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
