# 簡易計算機

純 HTML／CSS／JavaScript 的網頁計算機，透過 GitHub Actions 部署到 GitHub Pages。

## 功能

- 加、減、乘、除、百分比、正負號、倒退刪除
- 支援鍵盤操作：數字、`+ - * /`、`Enter`／`=`、`Backspace`、`Esc`
- 修正常見浮點數誤差（例如 `0.1 + 0.2 = 0.3`），除以零會顯示「錯誤」
- 自動跟隨系統深色模式

## 本機預覽

直接用瀏覽器開啟 `index.html` 即可。

## 部署

推送到預設分支後，`.github/workflows/pages.yml` 會自動部署。
第一次使用前，請到 repo 的 **Settings → Pages**，將 **Source** 設為 **GitHub Actions**。
