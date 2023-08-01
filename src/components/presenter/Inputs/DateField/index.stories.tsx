import { Meta, StoryObj } from '@storybook/react'
import { DateField } from '.'

export default { component: DateField } as Meta<typeof DateField>

export const Parts: StoryObj<typeof DateField> = {
  args: {
    placeholder: 'テキストを入力できます',
  },
  render: (props) => <DateField {...props} style={{ width: '300px' }} />,
}
