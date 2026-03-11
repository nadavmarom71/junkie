"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] focus-visible:border-ring focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-white/10",
        "data-[size=default]:h-7 data-[size=default]:w-14 data-[size=sm]:h-5 data-[size=sm]:w-10",
        className
      )}
      {...props}
    >
      {/* ON/OFF label */}
      <span className="absolute inset-0 flex items-center text-[10px] font-bold select-none pointer-events-none data-[size=sm]:text-[8px]">
        <span className="flex-1 text-center text-white/90 transition-opacity group-data-[state=unchecked]/switch:opacity-0 group-data-[state=checked]/switch:opacity-100 ps-1">
          ON
        </span>
        <span className="flex-1 text-center text-white/50 transition-opacity group-data-[state=checked]/switch:opacity-0 group-data-[state=unchecked]/switch:opacity-100 pe-1">
          OFF
        </span>
      </span>
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full ring-0 transition-transform",
          "bg-white shadow-sm",
          "group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-3.5",
          "data-[state=checked]:translate-x-[calc(100%+4px)] data-[state=unchecked]:translate-x-[3px]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
