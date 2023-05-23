import { Meta, StoryObj } from '@storybook/react'
import { SeachBoxField } from '.'

export default { component: SeachBoxField } as Meta<typeof SeachBoxField>

export const Parts: StoryObj<typeof SeachBoxField> = {
  args: {
    placeholder: 'Search...',
  },
}
