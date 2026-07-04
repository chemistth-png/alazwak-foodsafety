import { Droplets } from "lucide-react";

interface DocumentHeaderProps {
  docCode?: string;
  version?: string;
  title?: string;
  effectiveDate?: string;
}

/**
 * DocumentHeader — Official ISO header shown ONLY when printing.
 * Hidden in screen view. Use Ctrl+P / window.print().
 */
const DocumentHeader = ({
  docCode = "DOC-000",
  version = "01",
  title = "",
  effectiveDate = "",
}: DocumentHeaderProps) => {
  return (
    <div className="hidden print:block print:mb-4 border border-black">
      <table className="w-full text-xs" dir="rtl">
        <tbody>
          <tr>
            <td className="border border-black p-2 w-24 align-middle text-center" rowSpan={3}>
              {/* Logo placeholder — replace with /horus-logo.png when provided */}
              <div className="flex flex-col items-center justify-center gap-1">
                <Droplets className="w-8 h-8" />
                <div className="font-bold text-[10px]">ALAZWAK</div>
              </div>
            </td>
            <td className="border border-black p-2 text-center font-bold" colSpan={2}>
              {title || "وثيقة رسمية"}
            </td>
          </tr>
          <tr>
            <td className="border border-black p-1.5">
              <span className="font-semibold">رقم الوثيقة: </span>
              {docCode}
            </td>
            <td className="border border-black p-1.5">
              <span className="font-semibold">الإصدار: </span>
              {version}
            </td>
          </tr>
          <tr>
            <td className="border border-black p-1.5">
              <span className="font-semibold">تاريخ السريان: </span>
              {effectiveDate || new Date().toLocaleDateString("ar-EG")}
            </td>
            <td className="border border-black p-1.5">
              <span className="font-semibold">تاريخ الطباعة: </span>
              {new Date().toLocaleDateString("ar-EG")}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default DocumentHeader;
