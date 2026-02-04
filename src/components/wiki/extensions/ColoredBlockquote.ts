import Blockquote from '@tiptap/extension-blockquote';

export interface ColoredBlockquoteOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    coloredBlockquote: {
      setBlockquoteColor: (color: string) => ReturnType;
      unsetBlockquoteColor: () => ReturnType;
    };
  }
}

export const ColoredBlockquote = Blockquote.extend<ColoredBlockquoteOptions>({
  addAttributes() {
    return {
      ...this.parent?.(),
      color: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-color'),
        renderHTML: (attributes) => {
          if (!attributes.color) {
            return {};
          }
          return {
            'data-color': attributes.color,
            style: `border-color: ${attributes.color}`,
          };
        },
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setBlockquoteColor:
        (color: string) =>
        ({ commands }) => {
          return commands.updateAttributes('blockquote', { color });
        },
      unsetBlockquoteColor:
        () =>
        ({ commands }) => {
          return commands.updateAttributes('blockquote', { color: null });
        },
    };
  },
});

export default ColoredBlockquote;
