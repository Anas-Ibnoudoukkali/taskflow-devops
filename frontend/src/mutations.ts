import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "./api";
export function useWrite<T>(
  path: string,
  method: string,
  onSuccess?: () => void,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: T) => api(path, method, data),
    onSuccess: () => {
      void client.invalidateQueries();
      toast.success(
        method === "DELETE" ? "Deleted successfully" : "Saved successfully",
      );
      onSuccess?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
