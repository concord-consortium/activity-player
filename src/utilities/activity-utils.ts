export enum PageLayouts {
  FullWidth = "l-full-width",
  Responsive = "l-responsive",
  SixtyForty = "l-6040",
  FortySixty = "r-4060",
}

export enum EmbeddableSections {
  Interactive = "interactive_box",
}

export const isQuestion = (embeddable: any) => {
  return (embeddable.embeddable.type === "ManagedInteractive");
  // embeddable.embeddable.type === "Embeddable::MultipleChoice"); TODO: handle old question types?
};
