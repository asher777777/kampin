import { getAllServices } from "@/features/services/actions";
import { ServicesDashboardClient } from "./ServicesDashboardClient";
export default async function ServicesDashboardPage() {
  const services = await getAllServices();

  return (
    <ServicesDashboardClient initialServices={services} />
  );
}
