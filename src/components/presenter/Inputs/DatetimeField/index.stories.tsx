import { Meta, StoryObj } from '@storybook/react'
import { DatetimeField } from '.'

export default { component: DatetimeField } as Meta<typeof DatetimeField>

export const Parts: StoryObj<typeof DatetimeField> = {
  args: {
    placeholder: 'テキストを入力できます',
  },
  render: (props) => <DatetimeField {...props} style={{ width: '300px' }} />,
}
