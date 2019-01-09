import {stylesSdBarcode} from "./controls/stylesSdBarcode";
import {stylesSdBusyContainer} from "./controls/stylesSdBusyContainer";
import {stylesSdButton} from "./controls/stylesSdButton";
import {stylesSdCard} from "./controls/stylesSdCard";
import {stylesSdCheckbox} from "./controls/stylesSdCheckbox";
import {stylesSdCheckboxGroup} from "./controls/stylesSdCheckboxGroup";
import {stylesSdCheckboxGroupItem} from "./controls/stylesSdCheckboxGroupItem";
import {stylesSdCombobox} from "./controls/stylesSdCombobox";
import {stylesSdComboboxItem} from "./controls/stylesSdComboboxItem";
import {stylesSdDockContainer} from "./controls/stylesSdDockContainer";
import {stylesSdDock} from "./controls/stylesSdDock";
import {stylesSdDropdown} from "./controls/stylesSdDropdown";
import {stylesSdDropdownPopup} from "./controls/stylesSdDropdownPopup";
import {stylesSdForm} from "./controls/stylesSdForm";
import {stylesSdFormItem} from "./controls/stylesSdFormItem";
import {stylesSdGrid} from "./controls/stylesSdGrid";
import {stylesSdGridItem} from "./controls/stylesSdGridItem";
import {stylesSdHtmlEditor} from "./controls/stylesSdHtmlEditor";
import {stylesSdIcon} from "./controls/stylesSdIcon";
import {stylesSdLabel} from "./controls/stylesSdLabel";
import {stylesSdList} from "./controls/stylesSdList";
import {stylesSdListItem} from "./controls/stylesSdListItem";
import {stylesSdMarkdownEditor} from "./controls/stylesSdMarkdownEditor";
import {stylesSdModal} from "./controls/stylesSdModal";
import {stylesSdMultiSelect} from "./controls/stylesSdMultiSelect";
import {stylesSdMultiSelectItem} from "./controls/stylesSdMultiSelectItem";
import {stylesSdPagination} from "./controls/stylesSdPagination";
import {stylesSdPane} from "./controls/stylesSdPane";
import {stylesSdSelect} from "./controls/stylesSdSelect";
import {stylesSdSelectItem} from "./controls/stylesSdSelectItem";
import {stylesSdSheetColumn} from "./controls/stylesSdSheetColumn";
import {stylesSdSheet} from "./controls/stylesSdSheet";
import {stylesSdSidebarContainer} from "./controls/stylesSdSidebarContainer";
import {stylesSdSidebar} from "./controls/stylesSdSidebar";
import {stylesSdTab} from "./controls/stylesSdTab";
import {stylesSdTabItem} from "./controls/stylesSdTabItem";
import {stylesSdTabview} from "./controls/stylesSdTabview";
import {stylesSdTabviewItem} from "./controls/stylesSdTabviewItem";
import {stylesSdTextfield} from "./controls/stylesSdTextfield";
import {stylesSdTopbarContainer} from "./controls/stylesSdTopbarContainer";
import {stylesSdTopbar} from "./controls/stylesSdTopbar";
import {stylesSdTopbarMenu} from "./controls/stylesSdTopbarMenu";
import {stylesSdView} from "./controls/stylesSdView";
import {stylesSdViewItem} from "./controls/stylesSdViewItem";
import {SdStylePresets} from "../style/SdStylePresets";
import {SdStyleBuilder} from "../style/SdStyleBuilder";

//tslint:disable:no-shadowed-variable
export const stylesControls = (s: SdStylePresets) => {
  return new SdStyleBuilder()
    .join(stylesSdBarcode(s))
    .join(stylesSdBusyContainer(s))
    .join(stylesSdButton(s))
    .join(stylesSdCard(s))
    .join(stylesSdCheckbox(s))
    .join(stylesSdCheckboxGroup(s))
    .join(stylesSdCheckboxGroupItem(s))
    .join(stylesSdCombobox(s))
    .join(stylesSdComboboxItem(s))
    .join(stylesSdDockContainer(s))
    .join(stylesSdDock(s))
    .join(stylesSdDropdown(s))
    .join(stylesSdDropdownPopup(s))
    .join(stylesSdForm(s))
    .join(stylesSdFormItem(s))
    .join(stylesSdGrid(s))
    .join(stylesSdGridItem(s))
    .join(stylesSdHtmlEditor(s))
    .join(stylesSdIcon(s))
    .join(stylesSdLabel(s))
    .join(stylesSdList(s))
    .join(stylesSdListItem(s))
    .join(stylesSdMarkdownEditor(s))
    .join(stylesSdModal(s))
    .join(stylesSdMultiSelect(s))
    .join(stylesSdMultiSelectItem(s))
    .join(stylesSdPagination(s))
    .join(stylesSdPane(s))
    .join(stylesSdSelect(s))
    .join(stylesSdSelectItem(s))
    .join(stylesSdSheetColumn(s))
    .join(stylesSdSheet(s))
    .join(stylesSdSidebarContainer(s))
    .join(stylesSdSidebar(s))
    .join(stylesSdTab(s))
    .join(stylesSdTabItem(s))
    .join(stylesSdTabview(s))
    .join(stylesSdTabviewItem(s))
    .join(stylesSdTextfield(s))
    .join(stylesSdTopbarContainer(s))
    .join(stylesSdTopbar(s))
    .join(stylesSdTopbarMenu(s))
    .join(stylesSdView(s))
    .join(stylesSdViewItem(s));
};
