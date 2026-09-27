import { createCrudService } from "../../../../utils/crudFactory";
import { SelectPresentacion } from "../../../../interfaces/gestion-producto/presentacion/interfaces-presentacion";
import ApiService from "../../../../utils/apiService";

const baseService = createCrudService("presentacion");

const PresentacionService = {
  ...baseService,
};

export default PresentacionService;

