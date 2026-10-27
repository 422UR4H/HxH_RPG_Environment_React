import useMediaQuery from "./useMediaQuery";

/** O verbo das dicas da mesa: "Clique" com mouse (ponteiro fino), "Toque" no resto. */
export default function usePointerVerb(): "Clique" | "Toque" {
  return useMediaQuery("(pointer: fine)") ? "Clique" : "Toque";
}
