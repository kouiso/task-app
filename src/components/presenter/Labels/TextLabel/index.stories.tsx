import { ComponentMeta, ComponentStoryObj } from '@storybook/react'
import { TextLabel } from '.'

export default { component: TextLabel } as ComponentMeta<typeof TextLabel>

export const Parts: ComponentStoryObj<typeof TextLabel> = {
  args: {
    label: 'これはラベルです。',
  },
}
