import { LabelItem, PromptEditor } from "@/types";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getImageFolder(imagePath: string): string {
  const parts = imagePath.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : '';
}

export function randomBetween(min: number, max: number): number {
  const value = Math.random() * (max - min) + min;
  return Math.round(value * 100) / 100;
}


export function randomIntBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getModelLabel(array: LabelItem[], name: string): string {
  return array.find(item => item.name === name)?.label || name;
}
