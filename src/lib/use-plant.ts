import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  decidePlantAssist,
  fetchPlantState,
  raisePlantException,
  restartPlant,
  spawnPlantCar,
} from "./api";

/**
 * The demo plant's controls: its live state, and the buttons that act on it.
 * Polls while mounted; every mutation refreshes the state so the card reacts immediately.
 */
export function usePlant() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ["plant"] });

  const state = useQuery({
    queryKey: ["plant"],
    queryFn: fetchPlantState,
    refetchInterval: 2_000,
    retry: 1,
  });

  return {
    state: state.data,
    running: state.data?.running ?? false,
    spawn: useMutation({ mutationFn: spawnPlantCar, onSuccess: refresh }),
    exception: useMutation({ mutationFn: raisePlantException, onSuccess: refresh }),
    restart: useMutation({ mutationFn: restartPlant, onSuccess: refresh }),
    decide: useMutation({
      mutationFn: ({ caseId, option }: { caseId: string; option: string }) =>
        decidePlantAssist(caseId, option),
      onSuccess: refresh,
    }),
  };
}

export type PlantControls = ReturnType<typeof usePlant>;
