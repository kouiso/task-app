import { ComponentMeta, ComponentStoryObj } from '@storybook/react'
import { TextField } from '.'

export default { component: TextField } as ComponentMeta<typeof TextField>

export const Parts: ComponentStoryObj<typeof TextField> = {
  args: {
    placeholder: 'テキストを入力できます',
  },
  render: (props) => <TextField {...props} style={{ width: '300px' }} />,
}
