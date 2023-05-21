import { ComponentMeta, ComponentStoryObj } from '@storybook/react'
import { MenuItem } from '.'

export default { component: MenuItem } as ComponentMeta<typeof MenuItem>

export const Parts: ComponentStoryObj<typeof MenuItem> = {
  args: {
    label: 'メニュー',
  },
}
