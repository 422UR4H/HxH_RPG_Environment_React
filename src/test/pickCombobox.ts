import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Escolhe uma opção num `PillSelect` (combobox): abre pelo clique e clica na opção.
 * Substitui `userEvent.selectOptions`, que só serve ao `<select>` nativo.
 */
export async function pickComboboxOption(
  combobox: HTMLElement,
  optionName: string | RegExp,
) {
  await userEvent.click(combobox);
  const listbox = await screen.findByRole("listbox");
  await userEvent.click(within(listbox).getByRole("option", { name: optionName }));
}
