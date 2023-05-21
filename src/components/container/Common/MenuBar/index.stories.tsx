import { ComponentMeta, ComponentStoryObj } from '@storybook/react'
import { MenuBar } from '.'

export default { component: MenuBar } as ComponentMeta<typeof MenuBar>

export const Parts: ComponentStoryObj<typeof MenuBar> = {
  args: {},
}
