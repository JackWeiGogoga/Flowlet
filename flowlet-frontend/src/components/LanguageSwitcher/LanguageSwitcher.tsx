import React from "react";
import { Dropdown } from "antd";
import { useTranslation } from "react-i18next";
import { MdLanguage } from "react-icons/md";
import { createStyles } from "antd-style";
import { languages, changeLanguage, type LanguageKey } from "@/locales";

const useStyles = createStyles(({ token }) => ({
  trigger: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 6,
    cursor: "pointer",
    color: token.colorTextSecondary,
    transition: "all 0.2s",
    "&:hover": {
      background: token.colorFillSecondary,
      color: token.colorText,
    },
  },
  icon: {
    fontSize: 18,
  },
  menuItem: {
    minWidth: 120,
  },
  menuLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  menuFlag: {
    fontSize: 16,
  },
}));

export const LanguageSwitcher: React.FC = () => {
  const { styles } = useStyles();
  const { i18n } = useTranslation();

  const currentLang = languages.find((lang) => lang.key === i18n.language);

  const handleChange = (key: string) => {
    changeLanguage(key as LanguageKey);
  };

  return (
    <Dropdown
      menu={{
        items: languages.map((lang) => ({
          key: lang.key,
          label: (
            <span className={styles.menuLabel}>
              <span className={styles.menuFlag}>{lang.flag}</span>
              {lang.label}
            </span>
          ),
          className: styles.menuItem,
          onClick: () => handleChange(lang.key),
        })),
        selectedKeys: [i18n.language],
      }}
      placement="bottomRight"
      trigger={["click"]}
    >
      <div className={styles.trigger} title={currentLang?.label}>
        <MdLanguage className={styles.icon} />
      </div>
    </Dropdown>
  );
};

export default LanguageSwitcher;
