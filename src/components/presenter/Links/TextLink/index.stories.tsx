import { ComponentMeta, ComponentStoryObj } from '@storybook/react'
import { TextLink } from '.'

export default { component: TextLink } as ComponentMeta<typeof TextLink>

export const Parts: ComponentStoryObj<typeof TextLink> = {
  args: {
    label: 'これはリンクです。',
    href: '#',
  },
}
