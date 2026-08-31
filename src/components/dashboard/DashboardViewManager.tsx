"use client";

import React from "react";

interface DashboardViewManagerProps {
  classicDashboard: React.ReactNode;
}

export function DashboardViewManager({ classicDashboard }: DashboardViewManagerProps) {
  return (
    <div className="w-full relative min-h-screen">
      {classicDashboard}
    </div>
  );
}
