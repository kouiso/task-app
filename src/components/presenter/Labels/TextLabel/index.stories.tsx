import { Meta, StoryObj } from '@storybook/react'
import { TextLabel } from '.'

export default { component: TextLabel } as Meta<typeof TextLabel>

export const Parts: StoryObj<typeof TextLabel> = {
  args: {
    label: 'これはラベルです。',
  },
}
