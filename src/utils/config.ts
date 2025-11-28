import { JSX } from "react";

// components/application/app-navigation/config.ts
export interface NavItemType {
  label: string;
  href: string;
  icon: React.ComponentType<any> | (() => JSX.Element);
  badge?: React.ReactNode;
}