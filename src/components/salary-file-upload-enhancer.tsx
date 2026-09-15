"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileSpreadsheet, Info } from "lucide-react";

const HEADERS = ["תעודת זהות", "מספר עובד", "שם פרטי", "שם משפחה", "סוג מוצר", "מספר פוליסה", "חודש שכר", "שכר", "סוג דיווח", "רובד שכר", "סעיף 14", "תאריך תחילת סעיף 14", "פיצויים מעסיק - סכום", "פיצויים מעסיק - אחוז", "תגמולים מעסיק - סכום", "תגמולים מעסיק - אחוז", "אכ״ע מעסיק - סכום", "אכ״ע מעסיק - אחוז", "שונות מעסיק - סכום", "שונות מעסיק - אחוז", "פיצויים עובד - סכום", "פיצויים עובד - אחוז", "תגמולים עובד - סכום", "תגמולים עובד - אחוז", "אכ״ע עובד - סכום", "אכ״ע עובד - אחוז", "שונות עובד - סכום", "שונות עובד - אחוז"];
const EXAMPLE = ["123456782", "EMP-001", "ישראל", "ישראלי", "קרן פנסיה", "POL-001", "2026-09", 12000, "שוטף", "רובד 1", "כן", "2024-01-01", 1000, 8.33, 780, 6.5, 0, 0, 0, 0, 0, 0, 720, 6, 0, 0, 0, 0];
const XLSX_TEMPLATE_BASE64 = "UEsDBBQAAAAIAOtBL11Gx01IlQAAAM0AAAAQAAAAZG9jUHJvcHMvYXBwLnhtbE3PTQvCMAwG4L9SdreZih6kDkQ9ip68zy51hbYpbYT67+0EP255ecgboi6JIia2mEXxLuRtMzLHDUDWI/o+y8qhiqHke64x3YGMsRoPpB8eA8OibdeAhTEMOMzit7Dp1C5GZ3XPlkJ3sjpRJsPiWDQ6sScfq9wcChDneiU+ixNLOZcrBf+LU8sVU57mym/8ZAW/B7oXUEsDBBQAAAAIAOtBL13TZ45t7wAAACsCAAARAAAAZG9jUHJvcHMvY29yZS54bWzNksFqwzAMhl9l+J4odmnZTOrLRk8dDFbY2M3YamsaJ8bWSPr2c7I2ZWwPsKOl358+gWoTpOkivsQuYCSH6W7wTZukCWt2JAoSIJkjep3KnGhzc99Fryk/4wGCNid9QBBVtQKPpK0mDSOwCDORqdoaaSJq6uIFb82MD5+xmWDWADbosaUEvOTA1DgxnIemhhtghBFGn74LaGfiVP0TO3WAXZJDcnOq7/uyX0y5vAOH9+ft67Ru4dpEujWYfyUn6Rxwza6T3xaPT7sNU6ISq6J6KPhyV91LvpRCfIyuP/xuwr6zbu/+sfFVUNXw6y7UF1BLAwQUAAAACADrQS9dmVycIxAGAACcJwAAEwAAAHhsL3RoZW1lL3RoZW1lMS54bWztWltz2jgUfu+v0Hhn9m0LxjaBtrQTc2l227SZhO1OH4URWI1seWSRhH+/RzYQy5YN7ZJNups8BCzp+85FR+foOHnz7i5i6IaIlPJ4YNkv29a7ty/e4FcyJBFBMBmnr/DACqVMXrVaaQDDOH3JExLD3IKLCEt4FMvWXOBbGi8j1uq0291WhGlsoRhHZGB9XixoQNBUUVpvXyC05R8z+BXLVI1lowETV0EmuYi08vlsxfza3j5lz+k6HTKBbjAbWCB/zm+n5E5aiOFUwsTAamc/VmvH0dJIgILJfZQFukn2o9MVCDINOzqdWM52fPbE7Z+Mytp0NG0a4OPxeDi2y9KLcBwE4FG7nsKd9Gy/pEEJtKNp0GTY9tqukaaqjVNP0/d93+ubaJwKjVtP02t33dOOicat0HgNvvFPh8Ouicar0HTraSYn/a5rpOkWaEJG4+t6EhW15UDTIABYcHbWzNIDll4p+nWUGtkdu91BXPBY7jmJEf7GxQTWadIZljRGcp2QBQ4AN8TRTFB8r0G2iuDCktJckNbPKbVQGgiayIH1R4Ihxdyv/fWXu8mkM3qdfTrOa5R/aasBp+27m8+T/HPo5J+nk9dNQs5wvCwJ8fsjW2GHJ247E3I6HGdCfM/29pGlJTLP7/kK6048Zx9WlrBdz8/knoxyI7vd9lh99k9HbiPXqcCzIteURiRFn8gtuuQROLVJDTITPwidhphqUBwCpAkxlqGG+LTGrBHgE323vgjI342I96tvmj1XoVhJ2oT4EEYa4pxz5nPRbPsHpUbR9lW83KOXWBUBlxjfNKo1LMXWeJXA8a2cPB0TEs2UCwZBhpckJhKpOX5NSBP+K6Xa/pzTQPCULyT6SpGPabMjp3QmzegzGsFGrxt1h2jSPHr+BfmcNQockRsdAmcbs0YhhGm78B6vJI6arcIRK0I+Yhk2GnK1FoG2camEYFoSxtF4TtK0EfxZrDWTPmDI7M2Rdc7WkQ4Rkl43Qj5izouQEb8ehjhKmu2icVgE/Z5ew0nB6ILLZv24fobVM2wsjvdH1BdK5A8mpz/pMjQHo5pZCb2EVmqfqoc0PqgeMgoF8bkePuV6eAo3lsa8UK6CewH/0do3wqv4gsA5fy59z6XvufQ9odK3NyN9Z8HTi1veRm5bxPuuMdrXNC4oY1dyzcjHVK+TKdg5n8Ds/Wg+nvHt+tkkhK+aWS0jFpBLgbNBJLj8i8rwKsQJ6GRbJQnLVNNlN4oSnkIbbulT9UqV1+WvuSi4PFvk6a+hdD4sz/k8X+e0zQszQ7dyS+q2lL61JjhK9LHMcE4eyww7ZzySHbZ3oB01+/ZdduQjpTBTl0O4GkK+A226ndw6OJ6YkbkK01KQb8P56cV4GuI52QS5fZhXbefY0dH758FRsKPvPJYdx4jyoiHuoYaYz8NDh3l7X5hnlcZQNBRtbKwkLEa3YLjX8SwU4GRgLaAHg69RAvJSVWAxW8YDK5CifEyMRehw55dcX+PRkuPbpmW1bq8pdxltIlI5wmmYE2eryt5lscFVHc9VW/Kwvmo9tBVOz/5ZrcifDBFOFgsSSGOUF6ZKovMZU77nK0nEVTi/RTO2EpcYvOPmx3FOU7gSdrYPAjK5uzmpemUxZ6by3y0MCSxbiFkS4k1d7dXnm5yueiJ2+pd3wWDy/XDJRw/lO+df9F1Drn723eP6bpM7SEycecURAXRFAiOVHAYWFzLkUO6SkAYTAc2UyUTwAoJkphyAmPoLvfIMuSkVzq0+OX9FLIOGTl7SJRIUirAMBSEXcuPv75Nqd4zX+iyBbYRUMmTVF8pDicE9M3JD2FQl867aJguF2+JUzbsaviZgS8N6bp0tJ//bXtQ9tBc9RvOjmeAes4dzm3q4wkWs/1jWHvky3zlw2zreA17mEyxDpH7BfYqKgBGrYr66r0/5JZw7tHvxgSCb/NbbpPbd4Ax81KtapWQrET9LB3wfkgZjjFv0NF+PFGKtprGtxtoxDHmAWPMMoWY434dFmhoz1YusOY0Kb0HVQOU/29QNaPYNNByRBV4xmbY2o+ROCjzc/u8NsMLEjuHti78BUEsDBBQAAAAIAOtBL10OwfQvlQQAAB8bAAAYAAAAeGwvd29ya3NoZWV0cy9zaGVldDEueG1sxVnbcps6FP0VhjNz3hwkATY0tmectGmbJo0bN0nbN2LLMVMuLihx26+vhCQOYETkkzh9CYattS9rRVveZrhJs+/5CmNi/IyjJB+ZK0LWrywrn69wHOQH6Ron1LJMszgg9Da7s/J1hoNFAYojCwHQt+IgTMzxsHg2zcbD9J5EYYKnmZHfx3GQ/TrCUboZmdCUDy7DuxVhD6zxcB3c4RkmV+tpRu+s0ssijHGSh2liZHg5Mifw1eQIMUCx4jrEm7zy2WCl3Kbpd3bzfjEygclcJ9j4NVtHYRHMIOn6DC/JMY4i6hCZRjAn4QOe0mUj8zYlJI2ZnaZJAkIfLbP0N06KmDjCdC1NZr21mDsRTlmNP0TCZlkPS6r6WWZ+UhBLiboNcnycRjfhgqxGpmcaC7wM7iNymW7eYUGWy/zN0ygv/hobvhbSMub3Oc1GgGkGcZjwa/BTkKwDQAKAdAG2ANi6AEcAHF2AKwBuE2ArAH0B6OtGGAjAQBfgCYCnC/AFwNcFQCCVA9qQUuym2giqIFJu2NQbKaNIwWFTcTVESg6bmqshUnTYVF0NkbLDLd19FUQKD7eUV0Kk9LCpPQIqiBQfNtVXQpBUHzXVV0qJpPpIW31UbvYt9ZUQqT7aUl8JkeqjrR3vqSBSfbS155UQqT7SVh9J9ZG2+kiqjwr1Ld6Iiy7+OiDBeJilGyNj66k/9qE4CvixMzLDhJ2IM5JRa0hxZPzvP9CFziG7gD67OL7NL/BQ2Izi1uFPUWUNMw4tQrNgvqy5iHj0eESAeESXXzzuDRWhGnl4vkynJdSxRnE8VQCF8zJW4VWEGrQ5f727c16WfOpx565kriXGGw2u3JosoBqqFALIqlpinDxVD68aCgBJWTW51sBvHw1cklP/n7N5YCie+h3FvdMVqdvN+/+pg0hZ0FEabal8S6hTjYyr4lZ2gDYrH3TLKTebkHNwaECnxeGZbhdxvPoGE7x4InentiUGlf8o2Wl2TOxco1Kv6gmCmkSDWpT6PuYplMILPF3TM6rP/dr2aO1TH/9alkKP5kZrbdwX2iL7XLJ6E2p0hn1xOf1rWe7C5afHe5/0xjcyKg/h/dB2+RIJ7cLQTL9zi7qc2pHn7Imozy+Y1y58Xe2lhyi+a+1O2/XLp7cLezd76RrPxt6Xl09vF/a+PrV5PBtR3/aayS6cTHQmK51G8WzcTDQmr6dnpMmRRQfRchpF5TSKFLlBZDtuf+ChtoFSBXpzPu0BANsGQxWk2oBE1Xwnie+tdCe1jYJPcCeWtA1/HV7ZGfGfOxfYtfEVONunimIIO1EFmV6cKch7q4IggPo94LeNYRzCfn9/oFoCAIbWQ3W+6iy1PjWJE7OVstNOP6qxqa3ID52S+pL1tlmogx6nB2CvldTzGkNbBH2smr0D266bL6rmgdcAT6vW/oFbt36qWhvIyw7brMP2ucN21WG77rDd1GpEDeuXWo1129cOr986bJNJl/Go3cgbm1X5yY29OjoPsrswyY0ILykGHAxc08j4GxN+Q9J10Zn5K5vi4woHC5yxBdS+TFMib9gPe+U7sfEfUEsDBBQAAAAIAOtBL10SZ3kmaAIAAMgKAAANAAAAeGwvc3R5bGVzLnhtbN1W24rbMBD9FaMPqOOYmrjEeaghUGjLwu5DX+VYTgS6uLK8JP36aiTHTnY1C9v2qQ6LR3N05syMRni3g70I9nhizCZnKdRQkZO1/ac0HQ4nJunwQfdMOaTTRlLrluaYDr1htB2AJEW6Xq2KVFKuyG6rRrmXdkgOelS2IiuS7radVotnTYLDbaWSJc9UVKSmgjeG+71UcnEJ7jU4Dlpok1iXCqtIBp7hV4CzsIIspziSK23AmQaF9+g0U9C/1fSvwQlwIe6Ldo7dtqfWMqP2buE53vkKSib76dK7DI6GXrL1R7IQ/MuJNNq0zMwyGbm6dlvBOusIhh9P8La6hyK1tVo6o+X0qBX1OVwZk+HCHpgQjzAWP7q72OcuCef7pYWjTaDUq+kSmswQJiwg/m20EPsm7PqPwiY9f9b28+iqUX79c9SWPRjW8bNfn7tZH4ue/ZPo6VTPTdPuWjZ7ExjDinyHWySWEEkzcmG5mlYn3rZMveqcC29p467pXXy3v2UdHYV9msGKLPY31vJRlvOuByhr2rXYX2FCsmKee6fFVcvOrK2npTk23kyc4VSnBwgvkb1/4gjGCVgcAQzTwTLAOIGF6fxP9WzQegKG5baJIhuUs0E5gRVDav/DdOKc0j3xSssyz4sC62hdRzOosb4VBfzFo2G5AQPTAaX39Ro/bXxC3p4D7EzfmhCsUnwSsUrxXgMS7xswyjJ+2pgOMLBTwGYH9OM6MFNxTp7DqWK5YTcYR8oSQ2AW4zNaFEh3CvjFzwe7JXlelnEEsHgGeY4hcBtxBMsAcsCQPPffwRffo/T6nUqX/113vwFQSwMEFAAAAAgA60EvXZeKuxzAAAAAEwIAAAsAAABfcmVscy8ucmVsc52SuW7DMAxAf8XQnjAH0CGIM2XxFgT5AVaiD9gSBYpFnb+v2qVxkAsZeT08EtweaUDtOKS2i6kY/RBSaVrVuAFItiWPac6RQq7ULB41h9JARNtjQ7BaLD5ALhlmt71kFqdzpFeIXNedpT3bL09Bb4CvOkxxQmlISzMO8M3SfzL38ww1ReVKI5VbGnjT5f524EnRoSJYFppFydOiHaV/Hcf2kNPpr2MitHpb6PlxaFQKjtxjJYxxYrT+NYLJD+x+AFBLAwQUAAAACADrQS9dqR24iTwBAAAjAgAADwAAAHhsL3dvcmtib29rLnhtbI1RUU7CQBC9SrMHsECUREL5kagkRokY/pd2Sifs7jSzAyhX8QJ6Iq7jtE0jiT9+7b43k7fvvZ0eiXcbol3y7l2ImalE6kmaxrwCb+MV1RB0UhJ7Kwp5m8aawRaxAhDv0tFgME69xWBm015ryeklIIFckIKSDbFGOMbfeQOTA0bcoEP5yEx7d2ASjwE9nqDIzMAksaLjIzGeKIh1q5zJucwMu8EaWDD/Q68ak292E1tG7ObVqpHMjAcqWCJHaTdafaseD6DLHdoL3aMT4LkVeGDa1xi2jYymSC9itD30Z1fihP9TI5Ul5jCnfO8hSNcjg2sMhlhhHU0SrIfMnL/Pn+evJpC+sCi6cKKuLqriCeqAF0XnrzdVQIkBimfVicprQfmSk+ZodUbXN8NbLWLv3J1yL+GJbNFn7P9n9gNQSwMEFAAAAAgA60EvXSQem6KtAAAA+AEAABoAAAB4bC9fcmVscy93b3JrYm9vay54bWwucmVsc7WRPQ6DMAyFrxLlADVQqUMFTF1YKy4QBfMjEhLFrgq3L4UBkDp0YbKeLX/vyU6faBR3bqC28yRGawbKZMvs7wCkW7SKLs7jME9qF6ziWYYGvNK9ahCSKLpB2DNknu6Zopw8/kN0dd1pfDj9sjjwDzC8XeipRWQpShUa5EzCaLY2wVLiy0yWoqgyGYoqlnBaIOLJIG1pVn2wT06053kXN/dFrs3jCa7fDHB4dP4BUEsDBBQAAAAIAOtBL11lkHmSGQEAAM8DAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbK2TTU7DMBCFrxJlWyUuLFigphtgC11wAWNPGqv+k2da0tszTtpKoBIVhU2seN68z56XrN6PEbDonfXYlB1RfBQCVQdOYh0ieK60ITlJ/Jq2Ikq1k1sQ98vlg1DBE3iqKHuU69UztHJvqXjpeRtN8E2ZwGJZPI3CzGpKGaM1ShLXxcHrH5TqRKi5c9BgZyIuWFCKq4Rc+R1w6ns7QEpGQ7GRiV6lY5XorUA6WsB62uLKGUPbGgU6qL3jlhpjAqmxAyBn69F0MU0mnjCMz7vZ/MFmCsjKTQoRObEEf8edI8ndVWQjSGSmr3ghsvXs+0FOW4O+kc3j/QxpN+SBYljmz/h7xhf/G87xEcLuvz+xvNZOGn/mi+E/Xn8BUEsBAhQDFAAAAAgA60EvXUbHTUiVAAAAzQAAABAAAAAAAAAAAAAAAIABAAAAAGRvY1Byb3BzL2FwcC54bWxQSwECFAMUAAAACADrQS9d02eObe8AAAArAgAAEQAAAAAAAAAAAAAAgAHDAAAAZG9jUHJvcHMvY29yZS54bWxQSwECFAMUAAAACADrQS9dmVycIxAGAACcJwAAEwAAAAAAAAAAAAAAgAHhAQAAeGwvdGhlbWUvdGhlbWUxLnhtbFBLAQIUAxQAAAAIAOtBL10OwfQvlQQAAB8bAAAYAAAAAAAAAAAAAACAgSIIAAB4bC93b3Jrc2hlZXRzL3NoZWV0MS54bWxQSwECFAMUAAAACADrQS9dEmd5JmgCAADICgAADQAAAAAAAAAAAAAAgAHtDAAAeGwvc3R5bGVzLnhtbFBLAQIUAxQAAAAIAOtBL12XirscwAAAABMCAAALAAAAAAAAAAAAAACAAYAPAABfcmVscy8ucmVsc1BLAQIUAxQAAAAIAOtBL12pHbiJPAEAACMCAAAPAAAAAAAAAAAAAACAAWkQAAB4bC93b3JrYm9vay54bWxQSwECFAMUAAAACADrQS9dJB6boq0AAAD4AQAAGgAAAAAAAAAAAAAAgAHSEQAAeGwvX3JlbHMvd29ya2Jvb2sueG1sLnJlbHNQSwECFAMUAAAACADrQS9dZZB5khkBAADPAwAAEwAAAAAAAAAAAAAAgAG3EgAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLBQYAAAAACQAJAD4CAAABFAAAAAA=";

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadBlob(content: BlobPart, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function downloadCsv() {
  const csv = "\ufeff" + [HEADERS, EXAMPLE].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  downloadBlob(csv, "text/csv;charset=utf-8", "alpha-salary-template.csv");
}

function downloadXlsx() {
  const binary = window.atob(XLSX_TEMPLATE_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  downloadBlob(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "alpha-salary-template.xlsx");
}

function xmlEscape(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function downloadXls() {
  const rows = [HEADERS, EXAMPLE]
    .map((row) => `<Row>${row.map((value) => `<Cell><Data ss:Type="${typeof value === "number" ? "Number" : "String"}">${xmlEscape(value)}</Data></Cell>`).join("")}</Row>`)
    .join("");
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="שכר"><Table>${rows}</Table></Worksheet>
</Workbook>`;
  downloadBlob("\ufeff" + xml, "application/vnd.ms-excel;charset=utf-8", "alpha-salary-template.xls");
}

export function SalaryFileUploadEnhancer() {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let activeInput: HTMLInputElement | null = null;
    let activeZone: HTMLElement | null = null;
    let toolsRoot: HTMLElement | null = null;

    const detach = () => {
      if (!activeZone) return;
      activeZone.removeEventListener("dragenter", onDragEnter);
      activeZone.removeEventListener("dragover", onDragOver);
      activeZone.removeEventListener("dragleave", onDragLeave);
      activeZone.removeEventListener("drop", onDrop);
      activeZone.classList.remove("drag-active");
      activeZone = null;
      activeInput = null;
    };

    const onDragEnter = (event: DragEvent) => {
      event.preventDefault();
      activeZone?.classList.add("drag-active");
    };
    const onDragOver = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      activeZone?.classList.add("drag-active");
    };
    const onDragLeave = (event: DragEvent) => {
      if (event.currentTarget === event.target) activeZone?.classList.remove("drag-active");
    };
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      activeZone?.classList.remove("drag-active");
      const file = event.dataTransfer?.files?.[0];
      if (!file || !activeInput) return;
      const transfer = new DataTransfer();
      transfer.items.add(file);
      activeInput.files = transfer.files;
      activeInput.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const attach = () => {
      const input = document.querySelector<HTMLInputElement>("#excel-file");
      if (!input) {
        detach();
        if (toolsRoot) toolsRoot.remove();
        toolsRoot = null;
        setMountNode(null);
        return;
      }
      const zone = input.closest<HTMLElement>(".upload-zone");
      if (!zone) return;

      if (activeInput !== input || activeZone !== zone) {
        detach();
        activeInput = input;
        activeZone = zone;
        zone.addEventListener("dragenter", onDragEnter);
        zone.addEventListener("dragover", onDragOver);
        zone.addEventListener("dragleave", onDragLeave);
        zone.addEventListener("drop", onDrop);
      }

      if (!toolsRoot || !toolsRoot.isConnected) {
        toolsRoot = document.createElement("div");
        toolsRoot.className = "salary-upload-tools-root";
        zone.insertAdjacentElement("afterend", toolsRoot);
        setMountNode(toolsRoot);
      }
    };

    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      detach();
      toolsRoot?.remove();
      setMountNode(null);
    };
  }, []);

  if (!mountNode) return null;

  return createPortal(
    <div className="salary-upload-tools">
      <div className="salary-upload-info">
        <Info size={18} />
        <div>
          <b>איזה קובץ שכר אפשר להעלות?</b>
          <span>כרגע מוגדר במערכת מבנה שכר אחד של Alpha. אפשר לשמור ולהעלות אותו כ־XLSX, XLS או CSV — אלה שלושה פורמטים טכניים לא שלושה מבני שכר שונים.</span>
        </div>
      </div>
      <div className="salary-template-panel">
        <div className="salary-template-title">
          <FileSpreadsheet size={18} />
          <div><h3>תבנית קובץ שכר</h3><span>הורידו את אותו מבנה בפורמט שנוח לכם</span></div>
        </div>
        <div className="salary-template-actions">
          <button type="button" className="btn btn-secondary" onClick={downloadXlsx}><Download size={14} />XLSX</button>
          <button type="button" className="btn btn-secondary" onClick={downloadXls}><Download size={14} />XLS</button>
          <button type="button" className="btn btn-secondary" onClick={downloadCsv}><Download size={14} />CSV</button>
        </div>
        <p>התבנית כוללת שורת כותרות ושורת דוגמה. בעתיד אפשר להוסיף מבנים נפרדים למערכות שכר שונות בלי לשנות את מסך ההעלאה.</p>
      </div>
    </div>,
    mountNode,
  );
}
