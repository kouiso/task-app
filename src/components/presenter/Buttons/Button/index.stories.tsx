import { ComponentMeta, ComponentStoryObj } from '@storybook/react'
import { Button } from '.'

export default { component: Button } as ComponentMeta<typeof Button>

export const parts: ComponentStoryObj<typeof Button> = {
  args: {
    label: 'Button',
  },
}
