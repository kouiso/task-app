import { Meta, StoryObj } from '@storybook/react'
import { TextField } from '.'

export default { component: TextField } as Meta<typeof TextField>

export const Parts: StoryObj<typeof TextField> = {
  args: {
    placeholder: 'テキストを入力できます',
  },
  render: (props) => <TextField {...props} style={{ width: '300px' }} />,
}
