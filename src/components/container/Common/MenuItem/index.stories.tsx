import { Meta, StoryObj } from '@storybook/react'
import { MenuItem } from '.'

export default { component: MenuItem } as Meta<typeof MenuItem>

export const Parts: StoryObj<typeof MenuItem> = {
  args: {
    label: 'メニュー',
  },
}
