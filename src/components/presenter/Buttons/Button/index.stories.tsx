import { Meta, StoryObj } from '@storybook/react'
import { Button } from '.'

export default { component: Button } as Meta<typeof Button>

export const Parts: StoryObj<typeof Button> = {
  args: {
    label: 'Button',
  },
}
