export const getAttributesName = (navList, searchState) => {    //  从路由列表里找到当前返回结果中必须的属性名
    let countName = ''
    let listName = ''
    for (let i = 0; i < navList.length; i++) {  //  根据当前搜索类型获得他结果中保存总数和列表名称的属性名
        if (navList[i].type === searchState.searchType) {
          countName = navList[i].resArgName.countName
          listName = navList[i].resArgName.listName

        }
    }
    return {countName, listName}
}