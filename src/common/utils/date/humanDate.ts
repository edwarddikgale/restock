import { formatDistanceToNow, format } from "date-fns";

export default function humanDate(date: string | Date) {
  const d = new Date(date);
  const diffHours = Math.abs(Date.now() - d.getTime()) / 36e5;

  if (diffHours < 24) {
    return formatDistanceToNow(d, { addSuffix: true });
  }

  return `${formatDistanceToNow(d, { addSuffix: true })} at ${format(d, "HH:mm")}`;
}
