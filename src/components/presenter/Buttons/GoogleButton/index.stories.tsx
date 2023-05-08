import { ComponentMeta, ComponentStoryObj } from '@storybook/react'
import { GoogleButton } from '.'

export default { component: GoogleButton } as ComponentMeta<typeof GoogleButton>

export const Parts: ComponentStoryObj<typeof GoogleButton> = {
  args: {},
}
