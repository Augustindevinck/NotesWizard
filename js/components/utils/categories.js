
// Gestionnaire de catégories
export class CategoryManager {
    constructor() {
        this.categories = this.loadCategories();
    }

    loadCategories() {
        const stored = localStorage.getItem('categoriesTree');
        return stored ? JSON.parse(stored) : [];
    }

    saveCategories() {
        localStorage.setItem('categoriesTree', JSON.stringify(this.categories));
    }

    addCategory(name, parentId = null) {
        const newCategory = {
            id: Date.now().toString(),
            name: name,
            children: [],
            notes: []
        };

        if (parentId) {
            this.findAndAddToParent(this.categories, parentId, newCategory);
        } else {
            this.categories.push(newCategory);
        }

        this.saveCategories();
        return newCategory;
    }

    findAndAddToParent(categories, parentId, newCategory) {
        for (let category of categories) {
            if (category.id === parentId) {
                category.children.push(newCategory);
                return true;
            }
            if (category.children.length > 0) {
                if (this.findAndAddToParent(category.children, parentId, newCategory)) {
                    return true;
                }
            }
        }
        return false;
    }

    deleteCategory(categoryId) {
        const deleteFromArray = (array) => {
            const index = array.findIndex(cat => cat.id === categoryId);
            if (index !== -1) {
                array.splice(index, 1);
                return true;
            }
            for (let category of array) {
                if (category.children.length > 0) {
                    if (deleteFromArray(category.children)) {
                        return true;
                    }
                }
            }
            return false;
        };

        deleteFromArray(this.categories);
        this.saveCategories();
    }

    moveCategory(categoryId, newParentId) {
        let categoryToMove = null;

        // Trouver et supprimer la catégorie de son emplacement actuel
        const findAndRemove = (array) => {
            const index = array.findIndex(cat => cat.id === categoryId);
            if (index !== -1) {
                categoryToMove = array.splice(index, 1)[0];
                return true;
            }
            for (let category of array) {
                if (category.children.length > 0) {
                    if (findAndRemove(category.children)) {
                        return true;
                    }
                }
            }
            return false;
        };

        findAndRemove(this.categories);

        if (categoryToMove) {
            if (newParentId) {
                this.findAndAddToParent(this.categories, newParentId, categoryToMove);
            } else {
                this.categories.push(categoryToMove);
            }
            this.saveCategories();
        }
    }
}
