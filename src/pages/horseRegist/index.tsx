/**
 * 馬匹登録画面
 * @packageDocumentation
 * /horseRegist
 * @file
 */

import styles from './style.module.scss'
import words from 'words/default'
import { TextField } from 'components/presenter/Inputs/TextField'
import { Button } from 'components/presenter/Buttons/Button'
import { DateField } from 'components/presenter/Inputs/DateField'
import { SelectField } from 'components/presenter/Inputs/SelectField'
import { CheckboxField } from 'components/presenter/Inputs/CheckboxField'
import { TextLabel } from 'components/presenter/Labels/TextLabel'
import { IconButton } from 'components/presenter/Buttons/IconButton'
/**
 * HorseRegistPageの定義
 */
const HorseRegistPage: React.FC = () => {
  const options: { value: string; label: string }[] = [
    { value: '0', label: 'a' },
  ]
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <IconButton src='images/share.svg' size={100} />
        <div className={styles.title}>
          <TextLabel className={styles.horseRegist} label={words.horseRegist} />
          <TextLabel
            className={styles.horseRegistCaption}
            label={words.horseRegistCaption}
          />
        </div>
      </div>
      <TextField
        placeholder={words.horseNamePlaceHolder}
        className={styles.horseName}
        id='horseName'
        label={words.horseName}
      />
      <div className={styles.containerWeightHeight}>
        <TextField
          placeholder={words.horseWeightPlaceHolder}
          className={styles.horseWeight}
          id='horseWeight'
          label={words.horseWeight}
        />
        <TextField
          placeholder={words.horseHeightPlaceHolder}
          className={styles.horseHeight}
          id='horseHeight'
          label={words.horseHeight}
        />
      </div>
      <div className={styles.containerKind}>
        <CheckboxField label={words.horseHin} id={'hinba'} />
        <CheckboxField label={words.horseBo} id={'boba'} />
        <CheckboxField label={words.horseSen} id={'senba'} />
      </div>
      <DateField
        placeholder={words.birthdayPlaceHolder}
        className={styles.birthday}
        id='birthday'
        label={words.birthday}
      />
      <SelectField
        placeholder={words.kindPlaceHolder}
        className={styles.kind}
        id='kind'
        label={words.kind}
        options={options}
      />
      <SelectField
        placeholder={words.hairColorPlaceHolder}
        className={styles.hairColor}
        id='hairColor'
        label={words.hairColor}
        options={options}
      />
      <div className={styles.footerBtn}>
        <Button label={words.cancel} className={styles.cancelBtn} />
        <Button label={words.regist} />
      </div>
    </div>
  )
}

export default HorseRegistPage
