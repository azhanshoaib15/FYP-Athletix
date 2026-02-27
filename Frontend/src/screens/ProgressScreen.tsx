import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { VictoryAxis, VictoryBar, VictoryChart, VictoryLine, VictoryPie, VictoryTheme } from 'victory-native';

const screenWidth = Dimensions.get('window').width;

const weeklyData = [
    { x: 'M', y: 2 },
    { x: 'T', y: 3 },
    { x: 'W', y: 5 },
    { x: 'T', y: 4 },
    { x: 'F', y: 7 },
    { x: 'S', y: 6 },
    { x: 'S', y: 4 },
];

const macroData = [
    { x: 'Protein', y: 43 },
    { x: 'Carbs', y: 37 },
    { x: 'Fat', y: 20 },
];

export default function ProgressScreen({ onNavigate }: ProgressScreenProps) {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('dashboard')}>
                <Text style={styles.backButtonText}>{'< Back'}</Text>
            </TouchableOpacity>

            <Text style={styles.header}>Weekly Progress</Text>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Activity (Line)</Text>
                <VictoryChart
                    theme={VictoryTheme.material}
                    width={screenWidth - 60}
                    height={220}
                    padding={{ top: 20, bottom: 40, left: 40, right: 40 }}
                >
                    <VictoryAxis
                        style={{
                            axis: { stroke: '#FFFFFF' },
                            tickLabels: { fill: '#FFFFFF', fontSize: 12, fontFamily: 'Inter' },
                            grid: { stroke: 'none' },
                        }}
                    />
                    <VictoryAxis
                        dependentAxis
                        style={{
                            axis: { stroke: '#FFFFFF' },
                            tickLabels: { fill: '#FFFFFF', fontSize: 12, fontFamily: 'Inter' },
                            grid: { stroke: '#333333', strokeDasharray: '4, 4' },
                        }}
                    />
                    <VictoryLine
                        data={weeklyData}
                        style={{
                            data: { stroke: '#800000', strokeWidth: 3 },
                        }}
                    />
                </VictoryChart>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Activity (Bar)</Text>
                <VictoryChart
                    theme={VictoryTheme.material}
                    width={screenWidth - 60}
                    height={220}
                    padding={{ top: 20, bottom: 40, left: 40, right: 40 }}
                    domainPadding={{ x: 20 }}
                >
                    <VictoryAxis
                        style={{
                            axis: { stroke: '#FFFFFF' },
                            tickLabels: { fill: '#FFFFFF', fontSize: 12, fontFamily: 'Inter' },
                            grid: { stroke: 'none' },
                        }}
                    />
                    <VictoryAxis
                        dependentAxis
                        style={{
                            axis: { stroke: '#FFFFFF' },
                            tickLabels: { fill: '#FFFFFF', fontSize: 12, fontFamily: 'Inter' },
                            grid: { stroke: '#333333', strokeDasharray: '4, 4' },
                        }}
                    />
                    <VictoryBar
                        data={weeklyData}
                        style={{
                            data: { fill: '#6A040F' },
                        }}
                        cornerRadius={{ top: 5 }}
                    />
                </VictoryChart>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Macros</Text>
                <View style={styles.macrosContainer}>
                    <View style={styles.macrosTextContainer}>
                        <View style={styles.macroRow}>
                            <View style={[styles.macroDot, { backgroundColor: '#800000' }]} />
                            <Text style={styles.macroText}>Protein 43%</Text>
                        </View>
                        <View style={styles.macroRow}>
                            <View style={[styles.macroDot, { backgroundColor: '#6A040F' }]} />
                            <Text style={styles.macroText}>Carbs 37%</Text>
                        </View>
                        <View style={styles.macroRow}>
                            <View style={[styles.macroDot, { backgroundColor: '#501313' }]} />
                            <Text style={styles.macroText}>Fat 20%</Text>
                        </View>
                    </View>
                    <View style={styles.pieContainer}>
                        <VictoryPie
                            data={macroData}
                            colorScale={['#800000', '#6A040F', '#501313']}
                            innerRadius={60}
                            width={150}
                            height={150}
                            padding={0}
                            labels={() => null}
                        />
                        <Text style={styles.pieCenterText}>43%</Text>
                    </View>
                </View>
            </View>
        </ScrollView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 50,
    },
    backButton: {
        marginBottom: 20,
        marginTop: 40,
        padding: 10,
        backgroundColor: '#501313',
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    backButtonText: {
        color: '#FFFFFF',
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 16,
    },
    header: {
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 28,
        color: '#FFFFFF',
        marginBottom: 20,
        marginLeft: 10,
    },
    card: {
        backgroundColor: '#111111',
        borderRadius: 20,
        padding: 15,
        marginVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 5,
    },
    cardTitle: {
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 18,
        color: '#FFFFFF',
        marginBottom: 10,
        marginLeft: 10,
    },
    macrosContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    macrosTextContainer: {
        flex: 1,
    },
    macroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    macroDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    macroText: {
        fontFamily: 'Inter',
        fontWeight: '600',
        fontSize: 16,
        color: '#FFFFFF',
    },
    pieContainer: {
        width: 150,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pieCenterText: {
        position: 'absolute',
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 24,
        color: '#FFFFFF',
    },
});
