import { Meta, StoryObj } from '@storybook/react'
import { TextLink } from '.'

export default { component: TextLink } as Meta<typeof TextLink>

export const Parts: StoryObj<typeof TextLink> = {
  args: {
    label: 'これはリンクです。',
    href: '#',
  },
}
