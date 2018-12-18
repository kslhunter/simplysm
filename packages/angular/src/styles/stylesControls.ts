import {SdStyleProvider} from "../provider/SdStyleProvider";
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

export const stylesControls = (vars: SdStyleProvider): string => {
  return stylesSdBarcode(vars) +
    stylesSdBusyContainer(vars) +
    stylesSdButton(vars) +
    stylesSdCard(vars) +
    stylesSdCheckbox(vars) +
    stylesSdCheckboxGroup(vars) +
    stylesSdCheckboxGroupItem(vars) +
    stylesSdCombobox(vars) +
    stylesSdComboboxItem(vars) +
    stylesSdDockContainer(vars) +
    stylesSdDock(vars) +
    stylesSdDropdown(vars) +
    stylesSdDropdownPopup(vars) +
    stylesSdForm(vars) +
    stylesSdFormItem(vars) +
    stylesSdGrid(vars) +
    stylesSdGridItem(vars) +
    stylesSdHtmlEditor(vars) +
    stylesSdIcon(vars) +
    stylesSdLabel(vars) +
    stylesSdList(vars) +
    stylesSdListItem(vars) +
    stylesSdMarkdownEditor(vars) +
    stylesSdModal(vars) +
    stylesSdMultiSelect(vars) +
    stylesSdMultiSelectItem(vars) +
    stylesSdPagination(vars) +
    stylesSdPane(vars) +
    stylesSdSelect(vars) +
    stylesSdSelectItem(vars) +
    stylesSdSheetColumn(vars) +
    stylesSdSheet(vars) +
    stylesSdSidebarContainer(vars) +
    stylesSdSidebar(vars) +
    stylesSdTab(vars) +
    stylesSdTabItem(vars) +
    stylesSdTabview(vars) +
    stylesSdTabviewItem(vars) +
    stylesSdTextfield(vars) +
    stylesSdTopbarContainer(vars) +
    stylesSdTopbar(vars) +
    stylesSdTopbarMenu(vars) +
    stylesSdView(vars) +
    stylesSdViewItem(vars);
};