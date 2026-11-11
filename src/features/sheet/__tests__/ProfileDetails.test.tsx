import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ProfileDetails from "../ProfileDetails";
import { createEmptyProfile } from "../factories/profile.factory";

function Harness({ seen }: { seen: string[] }) {
  const [profile, setProfile] = useState(createEmptyProfile());
  return (
    <ProfileDetails
      profile={profile}
      onBackgroundClick={() => {}}
      onBriefDescriptionChange={(v) => {
        seen.push(v);
        setProfile({ ...profile, briefDescription: v });
      }}
    />
  );
}

describe("ProfileDetails brief description limit", () => {
  it("accepts 255 emojis and cuts a paste of 256 at 255 code points", () => {
    const seen: string[] = [];
    render(<Harness seen={seen} />);
    const field = screen.getByLabelText("Descrição breve:");
    fireEvent.change(field, { target: { value: "😀".repeat(255) } });
    expect(seen[seen.length - 1]).toBe("😀".repeat(255));
    fireEvent.change(field, { target: { value: "😀".repeat(256) } });
    expect(field).toHaveValue("😀".repeat(255));
    expect(seen[seen.length - 1]).toBe("😀".repeat(255));
  });
});
