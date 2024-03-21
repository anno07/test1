module.exports = (permissions, materialId) => {
    if (permissions.length === 0) return 0;
    let quantity = 0;
    let total = 0;
    for (const permission of permissions) {
        for(const ele of permission.materials) {
            if(ele.material.toString() === materialId.toString()) {
                total += +ele.total;
                quantity += +ele.quantity;
                break;
            }
        }
    }
    if (!quantity || !total) return 0;
    return (total / quantity).toFixed(2);
}